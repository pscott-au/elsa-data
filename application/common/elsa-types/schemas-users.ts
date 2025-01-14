import {
  Static,
  TLiteral,
  TSchema,
  TString,
  TUnion,
  Type,
} from "@sinclair/typebox";
import { CodingSchema } from "./schemas-coding";
import { StringUnion, TypeDate } from "./typebox-helpers";

export const UserSummarySchema = Type.Object({
  id: Type.String(),

  subjectIdentifier: Type.String(),
  email: Type.String(),
  displayName: Type.String(),
  lastLogin: TypeDate,

  isAllowedChangeUserPermission: Type.Boolean(),
  isAllowedCreateRelease: Type.Boolean(),
  isAllowedRefreshDatasetIndex: Type.Boolean(),
  isAllowedOverallAdministratorView: Type.Boolean(),
});

export type UserSummaryType = Static<typeof UserSummarySchema>;

// User permissions type
const permissionTypeArray = [
  "isAllowedChangeUserPermission",
  "isAllowedRefreshDatasetIndex",
  "isAllowedCreateRelease",
  "isAllowedOverallAdministratorView",
] as const;
export type UserPermissionType = (typeof permissionTypeArray)[number];
