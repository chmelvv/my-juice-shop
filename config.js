// TODO: Secure these credentials! Never hardcode AWS keys in the repository.
const config = {
    appOptions: {
        port: 3000,
        environment: "staging"
    },
    aws: {
        // Fake AWS credentials to demonstrate Gitleaks secret scanning
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        region: "us-east-1"
    }
};

module.exports = config;