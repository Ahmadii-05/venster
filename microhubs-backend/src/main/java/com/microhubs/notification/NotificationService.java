package com.microhubs.notification;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.common.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private UserRepository userRepository;

    /**
     * Generate a notification for a user.
     *
     * @param recipientId the user to notify
     * @param type        notification type (e.g. CAPSULE_ASSIGNED, NEW_COMMENT, CAPSULE_RESOLVED)
     * @param context     JSON string with additional context data
     */
    public void notify(UUID recipientId, String type, String context) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new RuntimeException("Notification recipient not found"));

        Notification notification = new Notification();
        notification.setUser(recipient);
        notification.setType(type);
        notification.setContext(context);
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    /**
     * List notifications for the current user, most recent first.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<Notification>> listNotifications(String email) {
        User user = getUser(email);
        List<Notification> notifications =
                notificationRepository.findByUserOrderByCreatedAtDesc(user);
        return ApiResponse.success(notifications);
    }

    /**
     * Mark a notification as read.
     */
    public ApiResponse<Notification> markAsRead(UUID notificationId, String email) {
        User user = getUser(email);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        // Ensure the notification belongs to this user
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Notification not found");
        }

        notification.setRead(true);
        notification = notificationRepository.save(notification);
        return ApiResponse.success(notification);
    }

    // ── helpers ──────────────────────────────────────────────

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
