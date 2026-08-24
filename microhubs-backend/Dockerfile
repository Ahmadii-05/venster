# ── Stage 1: build ──────────────────────────────────────────
FROM eclipse-temurin:17-jdk-jammy AS build

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy pom first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# ── Stage 2: runtime ────────────────────────────────────────
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app
COPY --from=build /workspace/target/microhubs-backend-1.0.0.jar /app.jar

EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app.jar"]
