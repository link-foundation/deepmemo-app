import { getLinkId } from "./get-link-id.js"
import { GQL_URL, GQL_TOKEN, DEVICE_LINK_ID } from "./config.js"

const uploadHistory = async (history) => {
	const containTypeLinkId = await getLinkId("@deep-foundation/core", "Contain");
	const browserExtensionLinkId = await getLinkId(DEVICE_LINK_ID, "BrowserExtension");
	const pageTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "Page");
	const urlTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "PageUrl");
	const titleTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "PageTitle");
	const typedCountTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "TypedCount");
	const visitCountTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "VisitCount");
	const lastVisitTimeTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "LastVisitTime");

	const historyData = history.map((page) => {
		return {
			type_id: pageTypeLinkId,
			number: { data: { value: page.id } },
			in: {
				data: [{
					type_id: containTypeLinkId,
					from_id: browserExtensionLinkId,
				}]
			},
			out: {
				data: [
					{
						type_id: containTypeLinkId,
						to: {
							data: {
								type_id: urlTypeLinkId,
								string: { data: { value: page.url } },
							}
						}
					},
					{
						type_id: containTypeLinkId,
						to: {
							data: {
								type_id: titleTypeLinkId,
								string: { data: { value: page.title } },
							}
						}
					},
					{
						type_id: containTypeLinkId,
						to: {
							data: {
								type_id: typedCountTypeLinkId,
								string: { data: { value: page.typedCount ? page.typedCount.toString() : "none" } },
							}
						}
					},
					{
						type_id: containTypeLinkId,
						to: {
							data: {
								type_id: visitCountTypeLinkId,
								string: { data: { value: page.visitCount ? page.visitCount.toString() : "none" } },
							}
						}
					},
					{
						type_id: containTypeLinkId,
						to: {
							data: {
								type_id: lastVisitTimeTypeLinkId,
								string: { data: { value: page.lastVisitTime ? page.lastVisitTime.toString() : "none" } },
							}
						}
					}]
			}
		};
	});

	const requestPayload = {
		query: `
        mutation insertHistory($historyData: [links_insert_input!]!) {
          insert_links(objects: $historyData) {
            returning {
              id
            }
          }
        }
      `,
		variables: {
			historyData: historyData,
		},
	};

	const response = await fetch(GQL_URL, {
		method: "POST",
		cache: "no-cache",
		headers: {
			"Authorization": `Bearer ${GQL_TOKEN}`,
			"Content-Type": "application/json",
		},
		redirect: "follow",
		referrerPolicy: "no-referrer",
		body: JSON.stringify(requestPayload),
	});

	const responseData = await response.json();
	console.log(responseData);

	return responseData.data.insert_links.returning;
};

const prepareHistoryData = async (history) => {
  const pageTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "Page");
  const urlTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "PageUrl");
  const titleTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "PageTitle");
  const typedCountTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "TypedCount");
  const visitCountTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "VisitCount");
  const lastVisitTimeTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "LastVisitTime");

  return history.map((page) => {
    return {
      type_id: pageTypeLinkId,
      number: { data: { value: page.id } },
      out: {
        data: [
          {
            type_id: urlTypeLinkId,
            string: { data: { value: page.url } },
          },
          {
            type_id: titleTypeLinkId,
            string: { data: { value: page.title } },
          },
          {
            type_id: typedCountTypeLinkId,
            string: { data: { value: page.typedCount ? page.typedCount.toString() : "none" } },
          },
          {
            type_id: visitCountTypeLinkId,
            string: { data: { value: page.visitCount ? page.visitCount.toString() : "none" } },
          },
          {
            type_id: lastVisitTimeTypeLinkId,
            string: { data: { value: page.lastVisitTime ? page.lastVisitTime.toString() : "none" } },
          },
        ],
      },
    };
  });
};

export const executeUploadHistory = async (history) => {
	const historyData = await prepareHistoryData(history);
	const existingHistory = await checkExistingHistory(history);

	const newHistory = historyData.filter(
		(page) => !existingHistory.some((existingPage) => existingPage.number.value === page.number.data.value)
	);

	if (newHistory.length) {
		await uploadHistory(newHistory);
	} else {
		console.log("No new history to upload.");
	}
};

const checkExistingHistory = async (history) => {
	const historyIds = history.map((page) => page.id);
	const pageTypeLinkId = await getLinkId("@deep-foundation/browser-extension", "Page");

	const requestPayload = {
		query: `
        query getHistoryByIds($historyIds: [Int!]) {
            links(where: {type_id: {_eq: ${pageTypeLinkId}}, number: {value: {_in: $historyIds}}}) {
                number {
                  value
                }
              }
      `,
		variables: {
			historyIds: historyIds,
		},
	};

	const response = await fetch(GQL_URL, {
		method: "POST",
		cache: "no-cache",
		headers: {
			"Authorization": `Bearer ${GQL_TOKEN}`,
			"Content-Type": "application/json",
		},
		redirect: "follow",
		referrerPolicy: "no-referrer",
		body: JSON.stringify(requestPayload),
	});

	const responseData = await response.json();
	return responseData.data.links;
};