import { pictureUrl } from "@/lib/image";
import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import InfiniteScroll from "@/components/InfiniteScroller";
import { useAppSelector } from "@/hook/useHookRedux";
import { ProductProps } from "@/type";
import { SearchOutlined } from "@ant-design/icons";
import {
  Card,
  Divider,
  Empty,
  Input,
  Select,
  Spin,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useDebouncedCallback } from "use-debounce";

const ProductDetail = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);

  const axiosAuth = AxiosJWTInstance({ user });
  const [query, setQuery] = useState<string>("");
  const [paginate, setPaginate] = useState<any>({
    value: "Show product per page",
    label: "Per page",
  });
  const [products, setProducts] = useState<ProductProps[]>([]);
  const [page, setPage] = useState(1);
  const [isHasMore, setIsHasMore] = useState<boolean>(true);

  const handleChangeInputSearch = useDebouncedCallback(async () => {
    const res = await axiosAuth({
      method: "GET",
      url: `/product/?productName=${query}&page=1&offset=${
        paginate.value === "Show product per page" ? 6 : paginate
      }`,
      headers: {
        Authorization: `Berear ${user?.accessToken}`,
      },
    });
    if (res.data.length > 0) {
      setProducts(res.data);
      toast.info("results found!");
    } else {
      setProducts([]);
      toast.info("No results found!");
    }
  }, 1000);

  useEffect(() => {
    (async () => {
      await axiosAuth({
        method: "GET",
        url: `/product${query ? `?productName=${query}&` : `?`}offset=${
          paginate.value === "Show product per page" ? 6 : paginate
        }`,
        headers: {
          Authorization: `Berear ${user?.accessToken}`,
        },
      })
        .then((response) => {
          setProducts([...response.data]);
          response.data.length === 0
            ? setIsHasMore(false)
            : setProducts([...response.data]);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    })();
  }, [paginate]);

  useEffect(() => {
    (async () => {
      await axiosAuth({
        method: "GET",
        url: `/product?page=${page}&offset=${
          paginate.value === "Show product per page" ? 6 : paginate
        }`,
        headers: {
          Authorization: `Berear ${user?.accessToken}`,
        },
      })
        .then((response) => {
          response.data.length === 0
            ? setIsHasMore(false)
            : setProducts([...products, ...response.data]);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    })();
  }, [page]);
  return (
    <>
      <Helmet title="ProductDetail">
        <></>
      </Helmet>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Products
          </Typography.Title>
          <Typography.Text type="secondary">
            Browse our catalogue and add items to your cart.
          </Typography.Text>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Search products..."
            name="productName"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleChangeInputSearch();
            }}
            className="sm:w-72"
          />
          <Select
            size="large"
            className="sm:w-44"
            value={paginate}
            onChange={(e) => setPaginate(e)}
            options={[
              {
                value: "Show product per page",
                label: "Per page",
              },
              { value: "6", label: "6 per page" },
              { value: "8", label: "8 per page" },
              { value: "12", label: "12 per page" },
            ]}
          />
        </div>
      </div>
      <InfiniteScroll
        loader={
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        }
        fetchMore={() => setPage((prev) => prev + 1)}
        hasMore={isHasMore}
        endMessage={
          products.length > 0 ? (
            <Divider plain>
              <Typography.Text type="secondary">
                You have seen all products
              </Typography.Text>
            </Divider>
          ) : (
            <></>
          )
        }
      >
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((item, i) => (
              <Link to={`/product-detail/${item.urlName}`} key={i}>
                <Card
                  hoverable
                  className="product-card h-full"
                  cover={
                    <img
                      src={pictureUrl(item.picture, 280)}
                      alt={item.name}
                    />
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <Typography.Text strong className="text-[16px]" ellipsis>
                      {item.name}
                    </Typography.Text>
                    <Typography.Text strong className="!text-indigo-600 text-[16px] shrink-0">
                      ${item.basePrice}
                    </Typography.Text>
                  </div>
                  <Typography.Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    className="!mt-2 !mb-0"
                  >
                    {item.description}
                  </Typography.Paragraph>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <Empty description="No products found" />
          </Card>
        )}
      </InfiniteScroll>
    </>
  );
};

export default ProductDetail;
