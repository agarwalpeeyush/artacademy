package com.artacademy.common.security;

/**
 * Canonical role-name constants, byte-matching the ROLES rows seeded in
 * auth-service (V1__init_auth_schema.sql). These are the bare role names as
 * stored and as carried in the JWT "roles" claim — Spring Security prepends
 * the "ROLE_" prefix itself, so do not include it here.
 *
 * Use these instead of scattering string literals so a rename is a single edit
 * and typos are caught at compile time. Note: this covers *security roles* only.
 * It is deliberately unrelated to domain enums like attendance record type,
 * which also happen to use words like "STUDENT"/"TEACHER".
 */
public final class RoleName {

    private RoleName() {}

    public static final String ADMIN = "ADMIN";
    public static final String PRINCIPAL = "PRINCIPAL";
    public static final String TEACHER = "TEACHER";
    public static final String STUDENT = "STUDENT";
    public static final String PARENT = "PARENT";
}
