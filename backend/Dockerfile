# Use Java 17
FROM eclipse-temurin:17-jdk

# Set working directory
WORKDIR /app

# Copy project
COPY . .

# Build with Maven
RUN ./mvnw clean package -DskipTests

# Run app
CMD ["java", "-jar", "target/*.jar"]