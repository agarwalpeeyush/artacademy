package com.artacademy.userservice.repository;

import com.artacademy.userservice.domain.Parent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ParentRepository extends JpaRepository<Parent, UUID> {

    Optional<Parent> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);

    /** Dedup lookup: an auto-created parent's identity is the phone number (also its loginId). */
    Optional<Parent> findByPhone(String phone);
}
