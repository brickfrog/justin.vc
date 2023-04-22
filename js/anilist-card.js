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
            User (name: "brickfrog") { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
                id
                name
                mediaListOptions {
                                scoreFormat
                            }
              }
              animeList: Page (page: 1, perPage: 1) {
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
              mangaList: Page (page: 1, perPage: 1) {
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
  const data = await fetchAniListProfile();

  if (data && data.User && data.animeList && data.mangaList) {
    const user = data.User;
    const lastAnime = data.animeList.mediaList[0].media;
    const lastManga = data.mangaList.mediaList[0].media;

    const cardHtml = `
    <div class="anilist-card">
        <div class="media-container">
            <div>
                <h3>Anime:</h3>
                <div class="media-entry">
                    <img src="${lastAnime.coverImage.medium}" alt="${lastAnime.title.userPreferred}">
                    <div class="media-details">
                        <h4>${lastAnime.title.userPreferred}</h4>
                        <p>Average Score: ${lastAnime.averageScore}</p>
                        <p>Popularity: ${lastAnime.popularity}</p>
                    </div>
                </div>
            </div>
            <div>
                <h3>Manga:</h3>
                <div class="media-entry">
                    <img src="${lastManga.coverImage.medium}" alt="${lastManga.title.userPreferred}">
                    <div class="media-details">
                        <h4>${lastManga.title.userPreferred}</h4>
                        <p>Average Score: ${lastManga.averageScore}</p>
                        <p>Popularity: ${lastManga.popularity}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    const container = document.getElementById("anilist-card-container");
    container.innerHTML = cardHtml;
  } else {
    console.error("AniList profile not found");
  }
}

document.addEventListener("DOMContentLoaded", () => displayAniListCard());
