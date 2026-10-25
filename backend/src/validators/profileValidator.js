const { requireText, optionalText } = require('./validationHelpers');

function validateProfileUpdate(body) {
  return {
    name: requireText(body.name, 'Name', 100),
    phone: optionalText(body.phone, 'Phone', 20),
  };
}

function validateAddress(body) {
  const pincode = requireText(body.pincode, 'Pincode', 10);
  return {
    fullName: requireText(body.fullName, 'Full name', 100),
    phone: requireText(body.phone, 'Phone', 20),
    line1: requireText(body.line1, 'Address line 1', 200),
    line2: optionalText(body.line2, 'Address line 2', 200),
    city: requireText(body.city, 'City', 80),
    state: requireText(body.state, 'State', 80),
    pincode,
    isDefault: body.isDefault === true,
  };
}

function validatePushToken(body) {
  return requireText(body.fcmToken, 'Push token', 500);
}

module.exports = { validateProfileUpdate, validateAddress, validatePushToken };
