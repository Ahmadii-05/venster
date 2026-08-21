package com.microhubs.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    boolean existsByEmail(String email);
}
</task_progress>
- [x] UserRepository with proper imports
</task_progress>
</write_to_file>

</final_file_content>