package com.microhubs.globalqa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GlobalQuestionRepository extends JpaRepository<GlobalQuestion, UUID> {

    List<GlobalQuestion> findByHiddenFalseOrderByCreatedAtDesc();

    @Query(value = """
            SELECT * FROM global_questions q
            WHERE q.hidden = false
            AND (:tag IS NULL OR :tag = '' OR :tag = ANY(q.tags))
            AND (:status IS NULL OR :status = '' OR q.status = :status)
            ORDER BY q.created_at DESC
            """, nativeQuery = true)
    List<GlobalQuestion> search(
            @Param("tag") String tag,
            @Param("status") String status);

    List<GlobalQuestion> findByAuthorId(UUID authorId);
}
