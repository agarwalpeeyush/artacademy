package com.artacademy.common.events;

public final class KafkaTopics {
    private KafkaTopics() {}

    public static final String STUDENT_CREATED = "student-created";
    public static final String TEACHER_CREATED = "teacher-created";
    public static final String PARENT_CREATED = "parent-created";
    public static final String STUDENT_DELETED = "student-deleted";
    public static final String TEACHER_DELETED = "teacher-deleted";
    public static final String PARENT_DELETED = "parent-deleted";
    public static final String ENROLLMENT_CREATED = "enrollment-created";
    public static final String ENROLLMENT_CANCELLED = "enrollment-cancelled";

    public static final String ATTENDANCE_RECORDED = "attendance-recorded";
    public static final String ATTENDANCE_UPDATED = "attendance-updated";

    public static final String FEE_GENERATED = "fee-generated";
    public static final String PAYMENT_RECEIVED = "payment-received";
    public static final String FEE_STATUS_UPDATED = "fee-status-updated";
    public static final String EXAM_SCHEDULED = "exam-scheduled";

    public static final String TIMETABLE_GENERATED = "timetable-generated";
    public static final String TIMETABLE_UPDATED = "timetable-updated";

    public static final String NOTIFICATION_REQUEST = "notification-request";
}
