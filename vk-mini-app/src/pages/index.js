import React, { useState, useEffect } from "react";
import bridge from "@vkontakte/vk-bridge";
import {
  ScreenSpinner,
  AdaptivityProvider,
  AppRoot,
  ConfigProvider,
  SplitLayout,
  SplitCol,
} from "@vkontakte/vkui";
import "@vkontakte/vkui/dist/vkui.css";
import {
  MdOutlineCheckBox,
  MdOutlineCheckBoxOutlineBlank,
} from "react-icons/md";
import { TextInput, Button, Group, Box } from "@mantine/core";
import { useForm } from "@mantine/form";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getServerSideProps = async () => {
  const config = await prisma.config.findMany({});
  return {
    props: { config: config[0] ?? {} },
  };
};

const Home = ({ config }) => {
  const [scheme, setScheme] = useState("bright_light");
  const [popout, setPopout] = useState(<ScreenSpinner size="large" />);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isErrored, setIsErrored] = useState(false);

  const form = useForm({
    initialValues: {
      groupID: "",
      postLink: "",
      promo: "",
    },
  });

  useEffect(() => {
    bridge.subscribe(({ detail: { type, data } }) => {
      if (type === "VKWebAppUpdateConfig") {
        setScheme(data.scheme);
      }
    });

    async function fetchData() {
      const user = await bridge.send("VKWebAppGetUserInfo");
      if (process.env.NEXT_PUBLIC_ADMIN_ID == user.id) setIsAdmin(true);
      const isSubscribed = await bridge.send("VKWebAppCallAPIMethod", {
        method: "groups.isMember",
        params: {
          group_id: parseInt(config.groupID),
          user_id: user.id,
          access_token: process.env.NEXT_PUBLIC_ACCESS_TOKEN,
          v: "5.131",
        },
      });
      const posts = await bridge
        .send("VKWebAppCallAPIMethod", {
          method: "wall.get",
          params: {
            owner_id: user.id,
            filter: "others",
            access_token: process.env.NEXT_PUBLIC_ACCESS_TOKEN,
            v: "5.131",
          },
        })
        .then((res) => res.response.items)
        .catch((err) => {
          console.log(err);
          setIsErrored(true);
          setIsSubscribed(!!isSubscribed.response);
          setPopout(null);
        });

      if (!isErrored) {
        const requiredPostId = config.postLink.split("_")[1] || "TESTDED";

        for (const post of posts) {
          if (
            post?.copy_history &&
            post.copy_history.some((el) => {
              return (
                el.owner_id.toString().includes(config.groupID) &&
                el.id == requiredPostId
              );
            })
          ) {
            setIsReposted(true);
          }
        }
      }

      setIsSubscribed(!!isSubscribed.response);
      setPopout(null);
    }
    form.setValues(config);
    fetchData();
  }, []);

  const handleSaveConfig = async (values) => {
    await fetch("/api/saveConfig", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify({ ...values, id: config.id }),
    });
  };

  return (
    <ConfigProvider scheme={scheme}>
      <AdaptivityProvider>
        <AppRoot>
          <SplitLayout popout={popout}>
            <SplitCol>
              <div className="container" id="app" style={{ marginTop: "20px" }}>
                <div className="row" id="mainAPP">
                  <div className="col-xs-12">
                    <h3
                      className="text-center"
                      style={{ marginBottom: "20px" }}
                    >
                      Выполняй задания и получай бонусы!
                    </h3>
                    <div
                      className="well"
                      style={{ maxHeight: "300px", overflow: "auto" }}
                    >
                      <ul className="list-group checked-list-box">
                        <li
                          id="subscribe"
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "4px",
                            alignItems: "center",
                          }}
                          className={`list-group-item ${
                            isSubscribed ? "list-group-item-success" : ""
                          }`}
                        >
                          {isSubscribed ? (
                            <MdOutlineCheckBox style={{ fontSize: "18px" }} />
                          ) : (
                            <MdOutlineCheckBoxOutlineBlank
                              style={{ fontSize: "18px" }}
                            />
                          )}
                          Подпишись на{" "}
                          <a style={{ cursor: "pointer" }}>наше сообщество</a>
                        </li>

                        <li
                          id="post"
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "4px",
                            alignItems: "center",
                          }}
                          className={`list-group-item ${
                            isReposted ? "list-group-item-success" : ""
                          }`}
                        >
                          {isReposted ? (
                            <MdOutlineCheckBox style={{ fontSize: "18px" }} />
                          ) : (
                            <MdOutlineCheckBoxOutlineBlank
                              style={{ fontSize: "18px" }}
                            />
                          )}
                          Сделай репост{" "}
                          <a href={config.postLink} target="_parent">
                            {config.postLink}
                          </a>
                        </li>
                      </ul>
                      <br />
                      <div id="promo" className="col-xs-12 text-center">
                        <div className="input-group">
                          <span className="input-group-addon">
                            Ваш промокод:
                          </span>
                          <div
                            className="form-control"
                            style={{
                              userSelect: "text",
                              cursor: "text",
                              textAlign: "left",
                            }}
                          >
                            {isSubscribed && isReposted
                              ? config.promo
                              : "Условия не выполнены"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {isAdmin ? (
                  <Box sx={{ maxWidth: 300 }} mx="auto">
                    <form onSubmit={form.onSubmit(handleSaveConfig)}>
                      <TextInput
                        label="ID группы"
                        {...form.getInputProps("groupID")}
                      />

                      <TextInput
                        label="Ссылка на пост"
                        {...form.getInputProps("postLink")}
                      />

                      <TextInput
                        label="Промокод"
                        {...form.getInputProps("promo")}
                      />

                      <Group position="right" mt="md">
                        <Button type="submit">Сохранить</Button>
                      </Group>
                    </form>
                  </Box>
                ) : null}
                {isErrored ? (
                  <div
                    style={{
                      width: "100%",
                      marginTop: "12px",
                      background: "#F03E3E",
                      color: "white",
                      textAlign: "center",
                      padding: "6px",
                      fontSize: "16px",
                      borderRadius: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Для работы с приложением необходимо открыть стену на своей
                    странице
                  </div>
                ) : null}
              </div>
            </SplitCol>
          </SplitLayout>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
};

export default Home;
