package com.artacademy.courseenrollment.user.repository;

import com.artacademy.courseenrollment.user.domain.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {

    Optional<Person> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);

    /** Indexed phone lookup (D2). Phone is NOT unique, so a match is a candidate to confirm-and-link. */
    List<Person> findByPhoneNumber(String phoneNumber);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, UUID id);
}
