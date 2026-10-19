const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('StreamingResponseExtension.js', 'utf8');
const route = fs.readFileSync('pages/api/openrouter-stream.js', 'utf8');
const haiku = 'anthropic/claude-haiku-5.5';
const old = 'anthropic/claude-haiku-4.5';
const sampling = { temperature: 0, top_p: 0.8, top_k: 10,
  presence_penalty: 0.1, frequency_penalty: 0.2, seed: 42 };
const content = 'data: {"choices":[{"delta":{"content":"Ahoj"}}]}\n\n';
const finish = 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n';
function stream(text) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({
    start(c) {
      // Deliberately split SSE lines and JSON across network reads.
      for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7));
      c.close();
    },
  }));
}
async function proxy(body, upstream = () => stream(content + finish)) {
  const calls = [];
  const ctx = vm.createContext({ TextDecoder, process: { env: {} },
    whitelistedDomains: ['icuk.cz'], URL,
    fetch: async (url, init) => {
      calls.push(JSON.parse(init.body));
      return upstream();
    },
  });
  vm.runInContext(route.replace(/^import .*;\n/, '')
    .replace('export default async function', 'async function'), ctx);
  const res = {
    output: '', ends: 0,
    setHeader() {}, writeHead() {}, flush() {},
    write(s) { this.output += s; }, end() { this.ends++; },
  };
  await ctx.handler({ method: 'POST', headers: { origin: 'https://icuk.cz' },
    body: { apiKey: 'test-only', userData: 'Hello', ...body } }, res);
  return { calls, res };
}
function noSampling(payload) {
  for (const key of Object.keys(sampling)) assert.equal(key in payload, false, key);
}

test('final upstream payload omits sampling for 5.5, with defaults, zero and explicit values', async () => {
  for (const temperature of [undefined, 0, 0.9]) {
    for (const suffix of ['', ':online', ':nitro', ':floor', ':online:nitro', ':exacto']) {
      const { calls } = await proxy({ model: haiku + suffix, ...sampling, temperature });
      noSampling(calls[0]);
      assert.equal(calls[0].stream, true);
    }
  }
});
test('primary model selection and supported fields survive normalization', async () => {
  const supported = { max_tokens: 1234, reasoning: { effort: 'low' }, stop: ['END'],
    tools: [{ type: 'function', function: { name: 'lookup', parameters: {} } }],
    tool_choice: 'auto', response_format: { type: 'json_object' } };
  const { calls } = await proxy({ models: [haiku + ':floor', old], ...sampling,
    ...supported, systemPrompt: 'System', messages: [{ role: 'user', content: 'User' }] });
  noSampling(calls[0]);
  for (const key of Object.keys(supported)) assert.deepEqual(calls[0][key], supported[key]);
  assert.deepEqual(calls[0].messages, [
    { role: 'system', content: 'System' }, { role: 'user', content: 'User' }]);
  assert.equal(calls[0].provider.sort, 'price');
  assert.equal((await proxy({ model: old, models: [haiku, old], temperature: 0 })).calls[0].temperature, 0);
});
test('legacy 4.5 and other models retain exact payload including default and zero temperature', async () => {
  for (const model of [old, 'openai/gpt-4.1', haiku + '-other']) {
    for (const options of [{}, sampling, { temperature: 0.4 }]) {
      const { calls } = await proxy({ model, ...options });
      assert.deepEqual(calls[0], { model, messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 4096, temperature: 0.7, stream: true, ...options });
    }
  }
});
test('unsupported tool choices fail clearly without contacting upstream', async () => {
  for (const tool_choice of ['required', { type: 'function', function: { name: 'lookup' } }, null, '']) {
    const { calls, res } = await proxy({ model: haiku, tool_choice });
    assert.equal(calls.length, 0);
    assert.match(res.output, /supports tool_choice only/);
    assert.equal(res.ends, 1);
  }
  for (const tool_choice of ['auto', 'none']) {
    assert.equal((await proxy({ model: haiku, tool_choice })).calls[0].tool_choice, tool_choice);
  }
  assert.equal((await proxy({ model: old, tool_choice: 'required' })).calls[0].tool_choice, 'required');
});
test('stream content, finish_reason, DONE, EOF and upstream errors', async () => {
  for (const ending of [finish, 'data: [DONE]\n\n', '']) {
    const { res } = await proxy({ model: haiku }, () => stream(content + ending));
    assert.equal(res.output, 'data: {"content":"Ahoj"}\n\ndata: [DONE]\n\n');
    assert.equal(res.ends, 1);
  }
  for (const upstream of [
    () => new Response('unavailable', { status: 503 }),
    () => stream(content + 'data: {"error":{"message":"overloaded"}}\n\n'),
    () => { throw new Error('network failure'); },
  ]) {
    const { res } = await proxy({ model: haiku }, upstream);
    assert.match(res.output, /"error":/);
    assert.doesNotMatch(res.output, /\[DONE\]/);
    assert.equal(res.ends, 1);
  }
});

// Execute the actual registry, parser, orchestrator and streaming client in
// their lexical scope. Only DOM rendering/Voiceflow are stubbed; no copied logic.
function client(fetch) {
  const ctx = vm.createContext({
    fetch, TextDecoder, AbortController, performance, setTimeout, clearTimeout,
    window: {}, trace: { payload: {} }, console,
    container: { querySelector: () => null },
    responseSection: { classList: { add() {} } }, responseContent: {},
    updateContent: () => {}, addAIInfoFooter: () => {},
  });
  vm.runInContext(`
    let isFirstChunk = false;
    ${source.slice(source.indexOf('    const modelsRegistry = ['), source.indexOf('    // Function to get detailed model info'))}
    ${source.slice(source.indexOf('    async function detectCorporateNetwork'), source.indexOf('    // Add final processing function'))}
    globalThis.registry = modelsRegistry;
  `, ctx);
  return ctx;
}
test('registry, sequences 2 / 45 / 45,2, streaming and failure fallback preserve inputs', async () => {
  for (const sequence of ['2', '45', '45,2']) {
    for (const failure of ['http', 'sse', 'partial-sse']) {
      const sent = [], upstream = [];
      const ctx = client(async (url, init) => {
        if (url.includes('voiceflow-variable-update')) return new Response('{}');
        const body = JSON.parse(init.body);
        sent.push(body);
        const fail = sequence === '45,2' && body.model === haiku;
        const result = await proxy(body, () => {
          if (!fail) return stream(content + finish);
          if (failure === 'http') return new Response('failed', { status: 503 });
          return stream((failure === 'partial-sse' ? content : '') +
            'data: {"error":{"message":"overloaded"}}\n\n');
        });
        upstream.push(...result.calls);
        return stream(result.res.output);
      });
      const input = { modelSequence: sequence, ...sampling, userData: 'Hello',
        systemPrompt: 'System', reasoning: { effort: 'low' } };
      const before = JSON.stringify(input);
      await ctx.orchestrateLLMCalls({ payload: input });
      assert.equal(JSON.stringify(input), before);
      assert.deepEqual(sent.map(p => p.model), sequence.split(',').map(id => id === '2' ? old : haiku));
      for (const p of [...sent, ...upstream]) {
        if (p.model === haiku) noSampling(p);
        else for (const key of Object.keys(sampling)) assert.equal(p[key], sampling[key]);
      }
      assert.equal(ctx.registry.find(m => m.id === 2).displayName, 'Claude Haiku 4.5');
      assert.equal(ctx.registry.find(m => m.id === 2).name, old);
      assert.equal(ctx.registry.find(m => m.id === 45).name, haiku);
      assert.equal(new Set(ctx.registry.map(m => m.id)).size, ctx.registry.length);
      assert.equal(JSON.stringify(ctx.parseModelSequence()), '[1]');
    }
  }
});
