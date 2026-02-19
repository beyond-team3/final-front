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

	    stage('Update Manifest (CD)') {
            when { branch 'main' } // main 브랜치 빌드일 때만 실행
            steps {
                script {
                    // 설정 변수
                    def manifestRepoUrl = "github.com/beyond-team3/final-manifests.git" // CD 레포지토리 주소 (https:// 빼고)
                    def targetFile = "frontend/deployment.yml" // 수정할 파일 경로
                    def imageName = "21monsoon/monsoon-frontend" // 도커 이미지 이름
                    def newTag = "${env.APP_VERSION_PREFIX}.${env.BUILD_ID}" // 새로 빌드된 태그

                    echo "[CD] GitOps 레포지토리의 ${targetFile} 버전을 ${newTag}로 업데이트합니다."

                    // 깃허브 자격증명 불러오기 (기존 github-access-token 사용)
                    withCredentials([usernamePassword(credentialsId: 'github-access-token', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh """
                            # 출력 로그 off
                            set +x

                            # 안전한 작업을 위해 임시 폴더 생성 후 Clone
                            rm -rf temp-manifests
                            git clone https://${GIT_USER}:${GIT_PASS}@${manifestRepoUrl} temp-manifests

                            # 출력 로그 on
                            set -x

                            cd temp-manifests

                            # 젠킨스 봇 계정 설정
                            git config user.email "jenkins-bot@monsoon.com"
                            git config user.name "Jenkins-CI-Bot"

                            # deployment.yml 파일에서 기존 image: 태그를 새 버전으로 덮어쓰기
                            sed -i "s|image: ${imageName}:.*|image: ${imageName}:${newTag}|g" ${targetFile}

                            # 변경사항 확인 및 Push
                            git add ${targetFile}
                            # 변경된 내용이 있을 때만 commit & push 진행
                            git diff-index --quiet HEAD || (git commit -m "Update ${imageName} to ${newTag}" && git push origin main)
                        """
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