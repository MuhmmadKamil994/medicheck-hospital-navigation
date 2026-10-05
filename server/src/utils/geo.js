/**
 * Straight-line ("as the crow flies") distance between two coordinates
 * using the Haversine formula.
 *
 * Build decision 2026-10-05: used instead of Google's paid Distance Matrix
 * API. Free, no API key, no network call — good enough for FYP demo scale.
 * Distances are labelled "approx." in the UI.
 *
 * @returns distance in kilometres
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // mean Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = { haversineKm };
