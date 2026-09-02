import { USE_API } from "../config/backend";
import * as firebaseAuth from "./auth.service";
import * as apiAuth from "./auth.api";

const impl = USE_API ? apiAuth : firebaseAuth;

export const register         = impl.register;
export const login            = impl.login;
export const resetPassword    = impl.resetPassword;
export const logout           = impl.logout;
export const getErrorMessage  = impl.getErrorMessage;

// Uniquement côté API — sans effet avec Firebase
export const restoreSession = apiAuth.restoreSession;