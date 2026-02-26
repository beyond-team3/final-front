FROM nginx:alpine

# 1. 설정 파일 복사
COPY default.conf /etc/nginx/conf.d/default.conf

# 2. 젠킨스가 이미 만들어둔 결과물(dist)만 가져옴
COPY dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]