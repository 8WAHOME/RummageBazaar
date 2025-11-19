// normalize phone input into digits (E.164-style without +, default country Kenya 254)
export function normalizePhone(input, defaultCountryCode = "254") {
  if (!input) return "";
  let digits = String(input).replace(/\D/g, "");
  if (digits.length >= 7 && digits.startsWith("0")) {
    // convert leading 0 local format to country code
    digits = defaultCountryCode + digits.slice(1);
  }
  // if starts with country code already, return digits
  return digits;
}
