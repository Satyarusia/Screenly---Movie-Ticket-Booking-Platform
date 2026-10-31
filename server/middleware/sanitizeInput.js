// Blocks MongoDB injection (keys starting with $ or containing a dot)
const hasBadKeys = (value) => {
  if (Array.isArray(value)) return value.some(hasBadKeys);
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, v]) => key.startsWith("$") || key.includes(".") || hasBadKeys(v)
    );
  }
  return false;
};

// Turns < and > into harmless text (stops <script> tricks), except in passwords
const clean = (value, key = "") => {
  if (Array.isArray(value)) return value.map((v) => clean(v, key));
  if (value && typeof value === "object") {
    const result = {};
    for (const [k, v] of Object.entries(value)) result[k] = clean(v, k);
    return result;
  }
  if (typeof value === "string" && !/password/i.test(key)) {
    return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    if (hasBadKeys(req.body)) {
      return res
        .status(400)
        .json({ message: "Request contains forbidden characters" });
    }
    req.body = clean(req.body);
  }
  next();
};

module.exports = sanitizeInput;