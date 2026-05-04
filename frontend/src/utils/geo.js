const toRadians = (value) => (value * Math.PI) / 180;

export const calculateDistance = (pointA, pointB) => {
  const earthRadiusInMeters = 6371000;
  const latitudeDelta = toRadians(pointB.lat - pointA.lat);
  const longitudeDelta = toRadians(pointB.lng - pointA.lng);
  const sourceLatitude = toRadians(pointA.lat);
  const targetLatitude = toRadians(pointB.lat);

  const haversineValue =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(sourceLatitude) *
      Math.cos(targetLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return earthRadiusInMeters * angularDistance;
};

export const isUserInsideGeoFence = (userLocation, geoFenceCenter, radiusMeters) => {
  const distance = calculateDistance(userLocation, geoFenceCenter);
  return distance <= radiusMeters;
};

// Ray-casting algorithm for polygon containment
export const isPointInPolygon = (point, polygon) => {
  const { lat, lng } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersects = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};
