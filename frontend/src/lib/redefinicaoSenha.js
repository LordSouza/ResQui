export function tokenRedefinicaoDaUrl() {
  return new URLSearchParams(window.location.search).get('redefinir');
}
