package com.artacademy.courseenrollment.user.repository;

import com.artacademy.courseenrollment.user.domain.Guardianship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GuardianshipRepository extends JpaRepository<Guardianship, Guardianship.Key> {

    List<Guardianship> findByGuardianPersonId(java.util.UUID guardianPersonId);

    List<Guardianship> findByStudentPersonId(java.util.UUID studentPersonId);

    void deleteByStudentPersonId(java.util.UUID studentPersonId);

    void deleteByGuardianPersonId(java.util.UUID guardianPersonId);
}
