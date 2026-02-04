pipeline {
	agent any

	tools {
		nodejs 'node-24'
	}

	environment {
		DOCKER_CREDENTIAL_ID = 'docker-hub-id'
		DISCORD_WEBHOOK = credentials('discord-webhook-url')
		IMAGE_NAME = '21monsoon/monsoon-frontend'
		APP_VERSION_PREFIX = '0.0'
	}

	stages {
		stage('Checkout') {
			steps {
				checkout scm
			}
		}

		stage('Install & Build') {
			steps {
				script {
					echo 'Installing Dependencies...'
					sh 'npm install'

					echo 'Building Project...'
					// CI=false: 경고를 에러로 처리하지 않음 (빌드 중단 방지)
					sh 'CI=false npm run build'
				}
			}
		}

		stage('Docker Build & Push') {
			when { branch 'main' }
			steps {
				script {
					def newTag = "${env.APP_VERSION_PREFIX}.${env.BUILD_ID}"
					echo "Building Docker Image: ${IMAGE_NAME}:${newTag}"

					docker.withRegistry('', "${DOCKER_CREDENTIAL_ID}") {
						def customImage = docker.build("${IMAGE_NAME}:${newTag}")
						customImage.push()
						customImage.push('latest')
					}
				}
			}
		}
	}

	post {
		success {
			discordSend (webhookURL: "${env.DISCORD_WEBHOOK}",
				title: "🟢 [Frontend] 빌드 성공",
				description: "Branch: ${env.BRANCH_NAME}\nBuild: #${env.BUILD_ID}",
				result: 'SUCCESS')
		}
		failure {
			discordSend (webhookURL: "${env.DISCORD_WEBHOOK}",
				title: "🔴 [Frontend] 빌드 실패",
				description: "Branch: ${env.BRANCH_NAME}\nBuild: #${env.BUILD_ID}",
				result: 'FAILURE')
		}
	}
}