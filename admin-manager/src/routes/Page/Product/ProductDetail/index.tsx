import { pictureUrl } from "@/lib/image";
import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import InfiniteScroll from "@/components/InfiniteScroller";
import { PRODUCT_SORT_OPTIONS } from "@/constants/product";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Category, Paginated, ProductProps } from "@/type";
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
import { useDebounce } from "use-debounce";

const PAGE_SIZE = 12;

const ProductDetail = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  const [query, setQuery] = useState("");
  const [search] = useDebounce(query.trim(), 400);
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState<string>();
  const [categories, setCategories] = useState<Category[]>([]);

  const [products, setProducts] = useState<ProductProps[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const isHasMore = loaded && products.length < total;

  useEffect(() => {
    axiosAuth
      .get<Category[]>("/category", { params: { offset: 100 } })
      .then(({ data }) => setCategories(data))
      .catch(() => undefined);
  }, []);

  // New filters: start again from page 1
  useEffect(() => {
    setPage(1);
    setLoaded(false);
  }, [search, sort, category]);

  useEffect(() => {
    let cancelled = false;
    axiosAuth
      .get<Paginated<ProductProps>>("/product", {
        params: {
          page,
          offset: PAGE_SIZE,
          productName: search || undefined,
          category,
          sort,
        },
      })
      .then(({ data }) => {
        if (cancelled) return;
        setProducts((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
        setTotal(data.total);
        setLoaded(true);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, [page, search, sort, category]);

  return (
    <>
      <Helmet title="ProductDetail">
        <></>
      </Helmet>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Products
          </Typography.Title>
          <Typography.Text type="secondary">
            {loaded ? `${total} products` : "Browse our catalogue"}
          </Typography.Text>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-64"
          />
          <Select
            size="large"
            allowClear
            placeholder="All categories"
            className="sm:w-44"
            value={category}
            onChange={setCategory}
            options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          />
          <Select
            size="large"
            className="sm:w-48"
            value={sort}
            onChange={setSort}
            options={PRODUCT_SORT_OPTIONS.filter((o) => o.value !== "oldest").map(
              (o) => ({ ...o })
            )}
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
                      ${Number(item.salePrice ?? item.basePrice).toFixed(2)}
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
