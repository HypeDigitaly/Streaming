s/\[([^\\]]+)\]\\(([^)]+(?:\\)[^)]*)*)\)/[([^\\]]+)]\\(([^)]+)\\)/g
s/Smart file extension detection for proper URL truncation/Simple file extension handling/g
s/extPattern = new RegExp.*extIndex = extMatch.index + ext.length;/extIndex = cleanUrl.indexOf(ext); if (extIndex !== -1) { cleanUrl = cleanUrl.substring(0, extIndex + ext.length); }/g
