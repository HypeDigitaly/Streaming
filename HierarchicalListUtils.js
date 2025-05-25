
/**
 * Utility functions for properly converting hierarchical lists from Markdown to HTML
 */

/**
 * Converts markdown hierarchical lists to properly nested HTML lists
 * @param {string} markdown - The markdown text containing lists
 * @return {string} HTML with properly nested lists
 */
function convertHierarchicalLists(markdown) {
  // Split content into lines for processing
  const lines = markdown.split('\n');
  const result = [];
  
  // Track list state
  let inList = false;
  let listType = null;
  let listStack = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for list items
    const unorderedMatch = line.match(/^(\s*)[\*\-]\s+(.*)/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    
    if (unorderedMatch || orderedMatch) {
      const match = unorderedMatch || orderedMatch;
      const indentation = match[1].length;
      const content = match[2];
      const currentListType = unorderedMatch ? 'ul' : 'ol';
      
      // If not in a list, start a new one
      if (!inList) {
        result.push(`<${currentListType}>`);
        listStack.push({ type: currentListType, indent: indentation });
        inList = true;
        listType = currentListType;
      } 
      // Handle nesting or list type changes
      else {
        const currentLevel = listStack[listStack.length - 1];
        
        // Going deeper in nesting
        if (indentation > currentLevel.indent) {
          result.push(`<${currentListType}>`);
          listStack.push({ type: currentListType, indent: indentation });
        }
        // Coming back up from nesting
        else if (indentation < currentLevel.indent) {
          // Close lists until we reach the correct level
          while (listStack.length > 0 && listStack[listStack.length - 1].indent > indentation) {
            result.push(`</${listStack.pop().type}>`);
          }
          
          // If the list type changed at this level, close and start a new one
          if (listStack.length > 0 && listStack[listStack.length - 1].type !== currentListType) {
            result.push(`</${listStack.pop().type}>`);
            result.push(`<${currentListType}>`);
            listStack.push({ type: currentListType, indent: indentation });
          }
        }
        // Same level but different list type
        else if (currentLevel.type !== currentListType) {
          result.push(`</${currentLevel.type}>`);
          result.push(`<${currentListType}>`);
          listStack.pop();
          listStack.push({ type: currentListType, indent: indentation });
        }
      }
      
      // Add the list item
      result.push(`<li>${content}</li>`);
    } 
    // Not a list item - close any open lists
    else if (inList) {
      // Close all open lists
      while (listStack.length > 0) {
        result.push(`</${listStack.pop().type}>`);
      }
      inList = false;
      result.push(line);
    } 
    // Regular line
    else {
      result.push(line);
    }
  }
  
  // Close any remaining open lists
  while (listStack.length > 0) {
    result.push(`</${listStack.pop().type}>`);
  }
  
  return result.join('\n');
}

module.exports = {
  convertHierarchicalLists
};
