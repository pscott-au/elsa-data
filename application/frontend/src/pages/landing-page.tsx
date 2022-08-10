import React, { useState } from "react";
import { useEnvRelay } from "../providers/env-relay-provider";
import { useNavigate } from "react-router-dom";
import { LayoutBase } from "../layouts/layout-base";
import { useCookies } from "react-cookie";
import {
  UI_PAGE_SIZE_COOKIE_NAME,
  UI_PAGE_SIZE_DEFAULT,
  USER_ALLOWED_COOKIE_NAME,
} from "@umccr/elsa-constants";
import { useUiAllowed } from "../hooks/ui-allowed";

export const HomePage: React.FC = () => {
  const envRelay = useEnvRelay();
  const navigate = useNavigate();

  const [cookies, setCookie, removeCookie] = useCookies<any>([
    UI_PAGE_SIZE_COOKIE_NAME,
    USER_ALLOWED_COOKIE_NAME,
  ]);

  const pageSizeFromCookie = parseInt(cookies[UI_PAGE_SIZE_COOKIE_NAME]);

  const pageSize = isFinite(pageSizeFromCookie)
    ? pageSizeFromCookie
    : UI_PAGE_SIZE_DEFAULT;

  const mutatePageSizeCookie = (newVal?: number) => {
    if (newVal)
      setCookie(UI_PAGE_SIZE_COOKIE_NAME, newVal.toString(), { path: "/" });
    else removeCookie(UI_PAGE_SIZE_COOKIE_NAME, { path: "/" });
  };

  const uiAllowed = useUiAllowed();

  return (
    <LayoutBase>
      <p className="prose">
        Current page size literal from cookie is '{pageSizeFromCookie}'
      </p>
      <p className="prose">
        Current page size in practice is therefore {pageSize}
      </p>
      <div className="flex flex-row space-x-2 mt-2 mb-2">
        <button className="btn-normal" onClick={() => mutatePageSizeCookie(5)}>
          Set page size 5
        </button>
        <button className="btn-normal" onClick={() => mutatePageSizeCookie(10)}>
          Set page size 10
        </button>
        <button className="btn-normal" onClick={() => mutatePageSizeCookie(15)}>
          Set page size 15
        </button>
        <button className="btn-normal" onClick={() => mutatePageSizeCookie(20)}>
          Set page size 20
        </button>
        <button
          className="btn-normal"
          onClick={() => mutatePageSizeCookie(undefined)}
        >
          Clear page size
        </button>
      </div>
      <p className="prose">
        The UI is enabled for the following functionality codes
        <ul>
          {Array.from(uiAllowed.values()).map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </p>
      <p className="prose">
        The frontend was given the following settings via the backend
        environment.
        <pre>{JSON.stringify(envRelay, null, 2)}</pre>
      </p>
      <div className="w-20 h-20 mt-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          viewBox="0 0 36.074 36.074"
          strokeWidth={1}
          stroke="#f00"
        >
          <g>
            <path
              d="M33.527,19.579l-8.045,2.154l-2.567-1.481l2.737-0.734c0.278-0.073,0.442-0.36,0.369-0.637
		c-0.074-0.277-0.359-0.444-0.637-0.369l-3.744,1.001l-2.562-1.477l2.562-1.479l3.742,1.003c0.045,0.013,0.091,0.018,0.136,0.018
		c0.229,0,0.439-0.153,0.502-0.386c0.074-0.278-0.091-0.563-0.37-0.638l-2.735-0.733l2.566-1.481l8.045,2.155
		c0.045,0.013,0.091,0.018,0.136,0.018c0.23,0,0.44-0.153,0.501-0.387c0.074-0.278-0.091-0.563-0.368-0.637l-7.038-1.885
		l6.708-3.874c0.248-0.143,0.333-0.462,0.19-0.711c-0.145-0.25-0.464-0.334-0.712-0.19l-6.705,3.873l1.886-7.037
		c0.073-0.278-0.091-0.563-0.368-0.638c-0.278-0.073-0.562,0.09-0.638,0.369l-2.155,8.042l-2.567,1.482l0.733-2.735
		c0.074-0.278-0.092-0.564-0.368-0.638c-0.275-0.073-0.563,0.091-0.638,0.369l-1.003,3.741l-2.562,1.476v-2.957l2.738-2.741
		c0.203-0.203,0.203-0.534,0-0.736c-0.202-0.203-0.533-0.203-0.736,0l-2.002,2.004V9.739l5.887-5.889
		c0.203-0.203,0.203-0.533,0-0.737c-0.202-0.203-0.533-0.203-0.736,0l-5.15,5.153V0.521C18.559,0.234,18.325,0,18.038,0
		c-0.287,0-0.521,0.234-0.521,0.521v7.745l-5.151-5.153c-0.204-0.203-0.534-0.203-0.737,0c-0.203,0.204-0.203,0.534,0,0.737
		l5.888,5.889v2.965L15.514,10.7c-0.204-0.203-0.534-0.203-0.737,0c-0.203,0.203-0.203,0.533,0,0.736l2.74,2.741v2.957l-2.562-1.479
		l-1.003-3.742c-0.076-0.278-0.359-0.441-0.638-0.369c-0.277,0.074-0.442,0.361-0.369,0.637l0.733,2.735l-2.567-1.482L8.957,5.393
		C8.881,5.114,8.597,4.951,8.319,5.024C8.041,5.098,7.876,5.384,7.95,5.662l1.885,7.037L3.129,8.825
		c-0.249-0.144-0.567-0.06-0.711,0.19C2.274,9.265,2.36,9.583,2.608,9.727L9.317,13.6l-7.039,1.885
		C2,15.56,1.835,15.846,1.91,16.123c0.062,0.233,0.272,0.387,0.502,0.387c0.045,0,0.09-0.006,0.135-0.018l8.045-2.155l2.566,1.481
		l-2.736,0.733c-0.278,0.074-0.442,0.36-0.369,0.637c0.062,0.234,0.273,0.387,0.502,0.387c0.045,0,0.09-0.005,0.135-0.018
		l3.742-1.003l2.562,1.479l-2.562,1.479l-3.743-1.002c-0.276-0.075-0.563,0.09-0.637,0.369c-0.074,0.279,0.091,0.563,0.369,0.638
		l2.737,0.732l-2.567,1.481l-8.045-2.153c-0.276-0.072-0.563,0.091-0.637,0.369C1.835,20.224,2,20.51,2.278,20.583l7.039,1.886
		l-6.708,3.873c-0.249,0.145-0.334,0.463-0.19,0.713c0.097,0.166,0.272,0.261,0.452,0.261c0.088,0,0.178-0.022,0.26-0.071
		l6.708-3.872l-1.887,7.035c-0.074,0.279,0.091,0.563,0.369,0.639c0.045,0.013,0.091,0.017,0.135,0.017
		c0.23,0,0.44-0.152,0.503-0.387l2.155-8.042l2.566-1.481l-0.732,2.734c-0.074,0.278,0.091,0.563,0.369,0.638
		c0.045,0.014,0.091,0.018,0.136,0.018c0.23,0,0.44-0.152,0.502-0.387l1.002-3.741l2.562-1.48v2.959l-2.74,2.741
		c-0.203,0.202-0.203,0.533,0,0.736c0.203,0.202,0.533,0.202,0.737,0l2.002-2v2.964l-5.888,5.891c-0.203,0.202-0.203,0.532,0,0.736
		c0.203,0.202,0.533,0.202,0.737,0l5.151-5.153v7.745c0,0.287,0.233,0.521,0.521,0.521c0.288,0,0.521-0.233,0.521-0.521v-7.745
		l5.15,5.153c0.103,0.102,0.236,0.151,0.369,0.151c0.134,0,0.268-0.052,0.368-0.151c0.204-0.204,0.204-0.534,0-0.736l-5.888-5.893
		v-2.964l2.002,2.004c0.103,0.103,0.236,0.152,0.368,0.152s0.268-0.051,0.369-0.152c0.204-0.202,0.204-0.533,0-0.736l-2.739-2.74
		v-2.957l2.561,1.479l1.002,3.741c0.062,0.233,0.273,0.387,0.501,0.387c0.045,0,0.09-0.006,0.137-0.019
		c0.277-0.073,0.442-0.362,0.368-0.637l-0.732-2.736l2.566,1.483l2.154,8.043c0.063,0.232,0.274,0.386,0.502,0.386
		c0.046,0,0.091-0.006,0.137-0.019c0.278-0.073,0.442-0.359,0.368-0.637l-1.888-7.037l6.708,3.874
		c0.083,0.048,0.172,0.069,0.261,0.069c0.18,0,0.354-0.093,0.452-0.261c0.144-0.248,0.059-0.567-0.19-0.712l-6.708-3.874
		l7.038-1.884c0.279-0.075,0.443-0.361,0.368-0.639C34.091,19.669,33.807,19.505,33.527,19.579z"
            />
          </g>
        </svg>
      </div>
    </LayoutBase>
  );
};
