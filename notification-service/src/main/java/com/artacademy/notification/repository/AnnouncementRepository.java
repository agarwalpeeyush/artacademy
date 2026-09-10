package com.artacademy.notification.repository;

import com.artacademy.notification.domain.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {

    Page<Announcement> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
