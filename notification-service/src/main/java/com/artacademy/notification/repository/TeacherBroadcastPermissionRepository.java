package com.artacademy.notification.repository;

import com.artacademy.notification.domain.TeacherBroadcastPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherBroadcastPermissionRepository
        extends JpaRepository<TeacherBroadcastPermission, UUID> {

    Optional<TeacherBroadcastPermission> findByTeacherId(UUID teacherId);
}
