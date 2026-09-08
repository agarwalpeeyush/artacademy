package com.artacademy.userservice.repository;

import com.artacademy.userservice.domain.Parent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ParentRepository extends JpaRepository<Parent, UUID> {

    Optional<Parent> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);

    List<Parent> findAllByLoginId(String loginId);

    List<Parent> findByStudentId(UUID studentId);
}
