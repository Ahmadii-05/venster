package com.microhubs.globalqa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GlobalAnswerRepository extends JpaRepository<GlobalAnswer, UUID> {

    List<GlobalAnswer> findByQuestionIdAndHiddenFalseOrderByCreatedAtAsc(UUID questionId);

    List<GlobalAnswer> findByQuestionIdOrderByCreatedAtAsc(UUID questionId);

    List<GlobalAnswer> findByAuthorId(UUID authorId);
}
