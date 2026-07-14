export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class StaffProfileMissingError extends AuthorizationError {
  constructor(message = "Staff profile is missing") {
    super(message);
    this.name = "StaffProfileMissingError";
  }
}

export class InactiveStaffError extends Error {
  constructor(message = "Staff profile is inactive") {
    super(message);
    this.name = "InactiveStaffError";
  }
}

export class StaffProfileLookupError extends Error {
  constructor(message = "Staff profile lookup failed") {
    super(message);
    this.name = "StaffProfileLookupError";
  }
}
