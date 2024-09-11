function removeURLs(text) {
    return text.replace(/https?:\/\/[^\s]+/g, '').replace(/www\.[^\s]+/g, '');
}
exports.removeURLs = removeURLs;
