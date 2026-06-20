# Build stage
FROM maven:3.8.8-openjdk-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests -pl parking-service

# Run stage
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/parking-service/target/parking-service-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
