FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the prebuilt JAR from the host build context
COPY target/*.jar app.jar

EXPOSE 8087
RUN apk add --no-cache curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8087/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]