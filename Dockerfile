# Stage 1: Build backend with Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY CandidateRecruitment/backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY CandidateRecruitment/backend/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime container
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
