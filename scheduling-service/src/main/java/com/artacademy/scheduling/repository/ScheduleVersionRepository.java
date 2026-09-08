package com.artacademy.scheduling.repository;

import com.artacademy.scheduling.domain.ScheduleVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScheduleVersionRepository extends JpaRepository<ScheduleVersion, UUID> {

    List<ScheduleVersion> findAllByOrderByVersionNumberDesc();

    Optional<ScheduleVersion> findTopByOrderByVersionNumberDesc();
}
