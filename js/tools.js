(function () {
  function getQueryParam(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function setStatus(element, message, type) {
    if (!element) return;
    element.textContent = message || "";
    element.className = `status${type ? ` ${type}` : ""}`;
  }

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (textContent !== undefined) element.textContent = textContent;
    return element;
  }

  function serializeForm(formElement) {
    return Object.fromEntries(new FormData(formElement).entries());
  }

  function copyText(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    return Promise.resolve();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.KaamTools = {
    getQueryParam,
    setStatus,
    createElement,
    serializeForm,
    copyText,
    escapeHtml
  };
})();
