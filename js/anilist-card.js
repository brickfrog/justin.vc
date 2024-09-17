async function fetchAniListProfile() {
  const cacheKey = "anilistProfileData";
  const cacheExpirationKey = "anilistProfileDataExpiration";
  const currentTime = Date.now();
  const cacheDuration = 60 * 60 * 1000; // 1 hour in milliseconds

  // Check if data is cached and still valid
  const cachedData = localStorage.getItem(cacheKey);
  const cachedDataExpiration = localStorage.getItem(cacheExpirationKey);

  if (
    cachedData &&
    cachedDataExpiration &&
    currentTime < parseInt(cachedDataExpiration, 10)
  ) {
    return JSON.parse(cachedData);
  }

  const query = `
  {
    User(name: "brickfrog") {
      id
      name
      mediaListOptions {
        scoreFormat
      }
    }
    animeList: Page(page: 1, perPage: 1) {
      mediaList(userName: "brickfrog", type: ANIME, sort: UPDATED_TIME_DESC, status: CURRENT) {
        media {
          id
          title {
            userPreferred
          }
          coverImage {
            medium
          }
          averageScore
          popularity
          
        }
      }
    }
    mangaList: Page(page: 1, perPage: 1) {
      mediaList(userName: "brickfrog", type: MANGA, sort: UPDATED_TIME_DESC, status: CURRENT) {
        media {
          id
          title {
            userPreferred
          }
          coverImage {
            medium
          }
          averageScore
          popularity
          
        }
      }
    }
  }
    `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: query,
      }),
    });

    const json = await response.json();

    if (json.errors) {
      console.error("AniList GraphQL Error:", json.errors);
      return null;
    }

    // Cache the fetched data and set an expiration timestamp
    localStorage.setItem(cacheKey, JSON.stringify(json.data));
    localStorage.setItem(
      cacheExpirationKey,
      (currentTime + cacheDuration).toString()
    );

    return json.data;
  } catch (error) {
    console.error("AniList API Error:", error);
    return null;
  }
}

async function displayAniListCard() {
  try {
    const data = await fetchAniListProfile();
    if (!data || !data.User || !data.animeList || !data.mangaList) {
      throw new Error("Incomplete data received from AniList");
    }

    const { User: user, animeList, mangaList } = data;

    if (
      !(
        animeList.mediaList &&
        animeList.mediaList[0] &&
        animeList.mediaList[0].media
      ) ||
      !(
        mangaList.mediaList &&
        mangaList.mediaList[0] &&
        mangaList.mediaList[0].media
      )
    ) {
      throw new Error("Incomplete media list data");
    }

    const lastAnime = animeList.mediaList[0].media;
    const lastManga = mangaList.mediaList[0].media;
    const animeUrl = "https://anilist.co/anime/" + lastAnime.id;
    const mangaUrl = "https://anilist.co/manga/" + lastManga.id;

    const cardHtml = `
        <div class="media-container">
            <div>
                <h3>Anime:</h3>
                <div class="media-entry">
                    <a href="${animeUrl}"><img src="${lastAnime.coverImage.medium}" alt="${lastAnime.title.userPreferred}"></a>
                    <div class="media-details">
                        <h4>${lastAnime.title.userPreferred}</h4>
                    </div>
                </div>
            </div>
            <div>
                <h3>Manga:</h3>
                <div class="media-entry">
                    <a href="${mangaUrl}"><img src="${lastManga.coverImage.medium}" alt="${lastManga.title.userPreferred}"></a>
                    <div class="media-details">
                        <h4>${lastManga.title.userPreferred}</h4>
                    </div>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById("anilist-card-container");
    container.innerHTML = cardHtml;
  } catch (error) {
    console.error(`AniList profile not found: ${error.message}`);
  }
}

document.addEventListener("DOMContentLoaded", () => displayAniListCard());
