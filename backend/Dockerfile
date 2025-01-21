FROM openjdk:21
RUN microdnf install findutils
COPY . .
RUN ./gradlew build
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "build/libs/websocketchat-0.0.1.jar"]