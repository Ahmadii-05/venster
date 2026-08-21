FROM eclipse-temurin:17-jdk-jammy

# Expect the built jar to be present at target/ (run `mvn clean package` before `docker compose up`)
ARG JAR_FILE=target/microhubs-backend-1.0.0.jar
COPY ${JAR_FILE} /app.jar

EXPOSE 8082
ENTRYPOINT ["java","-jar","/app.jar"]
