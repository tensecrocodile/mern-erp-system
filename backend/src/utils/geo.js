function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceInMeters(pointA, pointB) {
  const earthRadiusInMeters = 6371000;
  const latitudeDelta = toRadians(pointB.latitude - pointA.latitude);
  const longitudeDelta = toRadians(pointB.longitude - pointA.longitude);
  const sourceLatitude = toRadians(pointA.latitude);
  const targetLatitude = toRadians(pointB.latitude);

  const haversineValue =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(sourceLatitude) *
      Math.cos(targetLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return earthRadiusInMeters * angularDistance;
}

function calculateFastDistanceInMeters(pointA, pointB) {
  const earthRadiusInMeters = 6371000;
  const sourceLatitude = toRadians(pointA.latitude);
  const targetLatitude = toRadians(pointB.latitude);
  const latitudeDelta = targetLatitude - sourceLatitude;
  const longitudeDelta = toRadians(pointB.longitude - pointA.longitude);
  const x = longitudeDelta * Math.cos((sourceLatitude + targetLatitude) / 2);
  const y = latitudeDelta;

  return Math.sqrt(x * x + y * y) * earthRadiusInMeters;
}

module.exports = {
  calculateDistanceInMeters,
  calculateFastDistanceInMeters,
};
