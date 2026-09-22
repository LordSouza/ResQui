export function linkConvite(token) {
  return `${window.location.origin}/?convite=${encodeURIComponent(token)}`;
}

export function tokenConviteDaUrl() {
  return new URLSearchParams(window.location.search).get('convite');
}
