'use client';
import React from 'react';

// This file is intentionally left as a valid but empty component.
// A file with a nearly identical name exists in /cajas/ (plural) which is correct.
// This "zombie" file in /caja/ (singular) was causing build failures because
// it was not a valid React module.
// By making it a valid, empty component, we ensure it doesn't break the production build
// if any part of the system accidentally tries to import it.
export function FundTransferDialog() {
  return null;
}
