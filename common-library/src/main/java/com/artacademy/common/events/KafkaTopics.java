package com.artacademy.common.events;

public final class KafkaTopics {
    private KafkaTopics() {}

    public static final String STUDENT_CREATED = "student-created";
    public static final String TEACHER_CREATED = "teacher-created";
    public static final String PARENT_CREATED = "parent-created";
    public static final String ENROLLMENT_CREATED = "enrollment-created";
    public static final String ENROLLMENT_CANCELLED = "enrollment-cancelled";

    public static final String ATTENDANCE_RECORDED = "attendance-recorded";
    public static final String ATTENDANCE_UPDATED = "attendance-updated";

    public static final String FEE_GENERATED = "fee-generated";
    public static final String PAYMENT_RECEIVED = "payment-received";
    public static final String FEE_STATUS_UPDATED = "fee-status-updated";

    public static final String SCHEDULE_GENERATED = "schedule-generated";
    public static final String SCHEDULE_UPDATED = "schedule-updated";

    public static final String NOTIFICATION_REQUEST = "notification-request";
}
