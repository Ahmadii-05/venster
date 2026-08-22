package com.microhubs.globalqa;

import com.microhubs.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface GlobalReportRepository extends JpaRepository<GlobalReport, UUID> {

    boolean existsByReporterAndTargetTypeAndTargetId(User reporter, String targetType, UUID targetId);
}
