package com.microhubs.knowledge;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Seeds the Global Community (the PUBLIC knowledge library) with a curated set of
 * well-known, solved developer problems so global search and the AI answer feature
 * have real content out of the box instead of an empty library.
 *
 * <p>These entries are original write-ups of canonical problems (not copied verbatim
 * from any site), stored in the app's structured format. Each one is embedded with the
 * same {@link EmbeddingClient} used at query time, so it is immediately searchable via
 * pgvector and citable by the AI answer endpoint.
 *
 * <p><b>Idempotent:</b> an entry is inserted only if no item with the same title exists,
 * so restarts never create duplicates. <b>Guarded</b> by {@code seed.global-knowledge}
 * (default {@code true}); set it to {@code false} to disable (the integration test does).
 * <b>Fail-safe:</b> any error is logged and swallowed so seeding can never block startup.
 */
@Component
@ConditionalOnProperty(name = "seed.global-knowledge", havingValue = "true", matchIfMissing = true)
public class GlobalKnowledgeSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(GlobalKnowledgeSeeder.class);

    private final KnowledgeRepository knowledgeRepository;
    private final EmbeddingClient embeddingClient;

    public GlobalKnowledgeSeeder(KnowledgeRepository knowledgeRepository, EmbeddingClient embeddingClient) {
        this.knowledgeRepository = knowledgeRepository;
        this.embeddingClient = embeddingClient;
    }

    @Override
    public void run(String... args) {
        try {
            int created = 0;
            int skipped = 0;
            for (Seed s : SEEDS) {
                try {
                    if (knowledgeRepository.existsByTitle(s.title())) {
                        skipped++;
                        continue; // already seeded — keep idempotent across restarts
                    }
                    // Embed the same text we index at write time elsewhere (summary + solution).
                    float[] embedding = embeddingClient.embed(s.summary() + " " + s.solution());
                    if (embedding == null) {
                        log.warn("Skipping seed '{}' — embedding was null", s.title());
                        continue;
                    }
                    KnowledgeItem item = new KnowledgeItem();
                    item.setTitle(s.title());
                    item.setSummary(s.summary());
                    item.setRootCause(s.rootCause());
                    item.setSolution(s.solution());
                    item.setTags(s.tags());
                    item.setCategory(s.category());
                    item.setConfidence(BigDecimal.valueOf(s.confidence()));
                    item.setEmbedding(embedding);
                    item.setApproved(true);
                    item.setVisibility(KnowledgeVisibility.PUBLIC);
                    // resolution + publishedBy stay null: these are library entries, not
                    // published capsule resolutions. Global search filters on visibility only.
                    knowledgeRepository.save(item);
                    created++;
                } catch (Exception e) {
                    // One bad row must not stop the rest of the seed.
                    log.warn("Failed to seed knowledge item '{}': {}", s.title(), e.getMessage());
                }
            }
            if (created > 0) {
                log.info("Global Community seeding: {} item(s) created, {} already present", created, skipped);
            } else {
                log.info("Global Community already seeded ({} item(s) present) — nothing to do", skipped);
            }
        } catch (Exception e) {
            // Never let seeding stop the application from starting.
            log.error("Global Community seeding failed (continuing startup): {}", e.getMessage(), e);
        }
    }

    // ── Seed data ────────────────────────────────────────────────
    // Original write-ups of canonical, widely-known developer problems, spread
    // across the app's categories (BUG / PERFORMANCE / SECURITY / CONFIGURATION /
    // TESTING / DESIGN / DOCUMENTATION).

    private record Seed(
            String title, String summary, String rootCause, String solution,
            String[] tags, String category, double confidence) {}

    private static final List<Seed> SEEDS = List.of(
            new Seed(
                    "Java NullPointerException when calling a method on a null reference",
                    "A program crashes at runtime with java.lang.NullPointerException when code dereferences a variable that holds null — for example calling a method or reading a field on an object that was never assigned.",
                    "A reference is null at the point it is used. Common sources are uninitialized fields, methods that return null (such as Map.get for a missing key), auto-unboxing a null Integer, or chained calls where an intermediate result is null.",
                    "Read the stack trace to find the exact line and reference that is null. Guard it before use with a null check, java.util.Optional, or Objects.requireNonNull for fail-fast validation. Prefer returning empty collections or Optional instead of null from methods, and compare with a known-non-null side first, e.g. \"value\".equals(input). On Java 14+ the helpful NullPointerException message names the exact variable.",
                    new String[]{"java", "nullpointerexception", "npe", "debugging"},
                    "BUG", 0.95),
            new Seed(
                    "React \"Too many re-renders\" / infinite render loop",
                    "A React component throws \"Too many re-renders\" or re-renders endlessly and freezes the UI, usually right after adding a state update or an effect.",
                    "State is updated during render instead of in response to an event or effect. Typical causes are calling a setState function directly in JSX (onClick={setOpen(true)} rather than onClick={() => setOpen(true)}), or a useEffect that updates state it also depends on without a correct dependency array.",
                    "Pass handlers as functions, not immediate calls: onClick={() => setCount(count + 1)}. Give useEffect a correct dependency array and avoid unconditionally setting state the effect depends on; use the functional updater setCount(c => c + 1) and guard updates with a condition. Where possible, derive values during render instead of storing them in state.",
                    new String[]{"react", "hooks", "useeffect", "javascript", "frontend"},
                    "BUG", 0.92),
            new Seed(
                    "N+1 query problem makes ORM-backed endpoints slow",
                    "An endpoint that loads a list of entities and then their related data issues one query for the list plus one extra query per row, producing hundreds of small queries and response times that grow with the data.",
                    "Lazy-loaded associations are accessed inside a loop, so the ORM (Hibernate/JPA, ActiveRecord, and others) fires a separate SELECT for each parent row's children instead of fetching them together.",
                    "Fetch associations in a single query: use a JOIN FETCH / JPQL fetch join, an @EntityGraph, or configured batch fetching (in other ORMs, the equivalent includes / prefetch). Turn on SQL logging to confirm the query count no longer scales with row count, and paginate large result sets.",
                    new String[]{"performance", "database", "orm", "hibernate", "jpa", "n+1"},
                    "PERFORMANCE", 0.90),
            new Seed(
                    "Preventing SQL injection with parameterized queries",
                    "Building SQL by concatenating user input lets an attacker change the query's meaning and read, modify, or delete data they should not be able to reach.",
                    "User-supplied values are placed directly into the SQL string, so input such as ' OR '1'='1 is interpreted as SQL logic instead of being treated as data.",
                    "Never concatenate untrusted input into SQL. Use parameterized queries / prepared statements (PreparedStatement in JDBC, bound parameters in JPA/Hibernate, or an ORM query builder) so values are sent separately from the SQL text. Anything that must be dynamic but cannot be parameterized (like a column or table name) should be whitelisted, and the database account should have least-privilege permissions.",
                    new String[]{"security", "sql-injection", "database", "owasp"},
                    "SECURITY", 0.95),
            new Seed(
                    "Store passwords hashed with bcrypt, never in plain text",
                    "Passwords saved in plain text — or with fast hashes like MD5 or SHA-256 — are exposed if the database leaks, letting attackers sign in as any user and reuse the credentials on other sites.",
                    "Plain text is directly readable, and fast general-purpose hashes are cheap to brute-force at scale; neither is designed to resist password cracking.",
                    "Hash passwords with a slow, salted, adaptive algorithm such as bcrypt, scrypt, or Argon2 via a well-reviewed library (for example Spring Security's BCryptPasswordEncoder). Let it generate a unique per-password salt, store only the resulting hash, and verify logins with the library's matches() function. Raise the work factor as hardware improves, and never log or email the raw password.",
                    new String[]{"security", "passwords", "bcrypt", "authentication", "hashing"},
                    "SECURITY", 0.94),
            new Seed(
                    "CORS error: \"No 'Access-Control-Allow-Origin' header is present\"",
                    "A browser blocks a frontend's fetch/XHR call to an API on a different origin with a console error about a missing Access-Control-Allow-Origin header, even though the same URL works from curl or Postman.",
                    "Cross-Origin Resource Sharing is a browser security policy. When the frontend origin differs from the API origin (different scheme, host, or port) the browser requires the server to opt in via CORS response headers; command-line clients don't enforce this.",
                    "Enable CORS on the server for the specific frontend origin. In Spring Boot use a CorsConfigurationSource / WebMvcConfigurer or @CrossOrigin, allowing the needed origins, methods, and headers. For credentialed requests set allow-credentials and list an explicit origin rather than \"*\". Make sure the preflight OPTIONS request is handled and not rejected by an auth filter first.",
                    new String[]{"cors", "http", "browser", "configuration", "api"},
                    "CONFIGURATION", 0.90),
            new Seed(
                    "Docker containers can't reach each other via localhost",
                    "One container (for example an app) fails with connection refused when it tries to reach another (for example a database) using localhost or 127.0.0.1, even though both containers are running.",
                    "Inside a container, localhost refers to that container itself, not the host or sibling containers — each container has its own network namespace.",
                    "Put the containers on the same Docker network (Docker Compose does this automatically) and connect using the other container's service name as the hostname, e.g. jdbc:postgresql://db:5432 instead of localhost, using the container's internal port rather than the host-published one. Use host.docker.internal only when you specifically need to reach a service running on the host machine.",
                    new String[]{"docker", "networking", "docker-compose", "configuration"},
                    "CONFIGURATION", 0.90),
            new Seed(
                    "Flaky asynchronous tests that pass and fail intermittently",
                    "A test that exercises asynchronous code (promises, timers, background threads) sometimes passes and sometimes fails with no code change, eroding trust in the whole suite.",
                    "The test asserts before the asynchronous work has finished, or it relies on fixed sleeps and real timing. Race conditions and state shared between tests make the result depend on scheduling.",
                    "Wait for the actual completion signal instead of guessing at timing: await the promise, use the framework's async helpers (await waitFor, CompletableFuture.get with a timeout, Awaitility), or fake timers — and avoid arbitrary sleeps. Isolate state between tests, and give the code under test a deterministic hook (callback, future, or event) the test can synchronize on.",
                    new String[]{"testing", "async", "flaky-tests", "concurrency"},
                    "TESTING", 0.88),
            new Seed(
                    "Lost updates under concurrency: optimistic vs pessimistic locking",
                    "When two users edit the same record at the same time, one person's save silently overwrites the other's — a \"lost update\". Choosing a locking strategy prevents the conflict.",
                    "A read-modify-write cycle with no concurrency control lets a second transaction overwrite changes the first made after it read the now-stale value.",
                    "Use optimistic locking when conflicts are rare: add a version column (JPA @Version) so a save fails if the row changed since it was read, then retry or prompt the user. Use pessimistic locking (SELECT ... FOR UPDATE) when conflicts are frequent and short-lived, accepting lower concurrency. Keep transactions short and surface conflicts to the user instead of discarding their data.",
                    new String[]{"design", "concurrency", "locking", "database", "transactions"},
                    "DESIGN", 0.88),
            new Seed(
                    "Choosing the right HTTP status codes for a REST API",
                    "An API that returns 200 OK for everything (including errors) or otherwise misuses status codes is hard for clients to consume, because they can't tell success from failure without parsing the body.",
                    "Status codes are treated as an afterthought, so the HTTP layer stops communicating the outcome and clients must inspect the payload to know what happened.",
                    "Map outcomes to standard codes: 200 for a successful read or update, 201 Created (with a Location header) for a new resource, 204 for success with no body, 400 for invalid input, 401 for unauthenticated vs 403 for authenticated-but-forbidden, 404 for a missing resource, 409 for a conflict, and reserve 5xx for genuine server-side failures. Keep a consistent error-body shape and document the codes each endpoint can return.",
                    new String[]{"documentation", "rest", "http", "api-design"},
                    "DOCUMENTATION", 0.90)
    );
}
