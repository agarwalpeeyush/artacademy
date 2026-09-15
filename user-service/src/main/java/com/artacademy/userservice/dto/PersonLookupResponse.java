package com.artacademy.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Phone-lookup result (OQ1). Returned by {@code GET /persons/lookup?phone=} so a create form can offer
 * "this looks like <name> (<roles>) — link them?" before reusing the account.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonLookupResponse {
    private UUID personId;
    private String loginId;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    /** Derived roles this person already holds, e.g. ["TEACHER","PRINCIPAL"]. */
    private List<String> roles;
}
