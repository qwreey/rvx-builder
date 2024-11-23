FROM node:lts-slim

WORKDIR /app

# This fixes settings being lost whenever the container is restarted
ENV SETTINGS_PATH=/app/rvx-builder/revanced/settings.json
ENV OPTIONS_PATH=/app/rvx-builder/revanced/options.json

RUN --mount=type=cache,target=/var/cache/apt \
  apt-get --yes update && \
  apt-get --yes install git wget java-common libasound2 libxi6 libxtst6 xdg-utils libgtk2.0-0 libatk1.0-0 libpango1.0-0 libgdk-pixbuf2.0-0 libcairo2 libgl1-mesa-glx && \
  wget -O /app/zulu.deb https://cdn.azul.com/zulu/bin/zulu17.52.17-ca-fx-jdk17.0.12-linux_amd64.deb && \
  yes | dpkg -i /app/zulu.deb && \
  rm /app/zulu.deb && \
  apt-get -f install

RUN git clone -b revanced-extended https://github.com/inotia00/rvx-builder --depth=1 --no-tags

WORKDIR /app/rvx-builder

# Npm ci command installs packages from package-lock.json file
# This ensures that the container will function over time.
RUN npm ci --omit=dev

EXPOSE 8000

CMD ["node", ".", "--no-open"]
