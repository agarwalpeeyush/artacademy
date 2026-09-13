package com.artacademy.attendance.domain;

/**
 * Distinguishes the two kinds of class session (R18).
 * <ul>
 *   <li>{@link #REGULAR} — the normal scheduled session for the whole enrolled roster.</li>
 *   <li>{@link #COVER_UP_CLASS} — an ad-hoc extra session a teacher runs for a subset of students
 *       who missed the regular one. It is free (no fee) and its attendance stands independently of
 *       the original absence (I6).</li>
 * </ul>
 */
public enum SessionKind {
    REGULAR,
    COVER_UP_CLASS
}
