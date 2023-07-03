// const columnMinWidth = 300;

export interface GetGridLayoutInput {
  containerWidth: number,
  itemWidth: number,
  categoryName: string,
  isOverriden: boolean,
  subcategories: Array<{
    name: string,
    itemsCount: number,
    itemsFeaturedCount: number,
  }>,
}

export interface GetGridLayoutOutput {
  layout: Array<Array<{
    subcategoryName: string,
    percentage: number,
  }>>,
}

export default function getGridLayout(input: GetGridLayoutInput): GetGridLayoutOutput {
  // Logic to calculate the grid layout goes here

  // Return provisional hardcoded layout until this is ready
  return getProvisionalHardcodedLayout(input);
}

function getProvisionalHardcodedLayout(input: GetGridLayoutInput): GetGridLayoutOutput {
  switch (input.categoryName) {
    case "App Definition and Development":
      return {
        layout: [
          [
            {
              subcategoryName: "Database",
              percentage: 28,
            },
            {
              subcategoryName: "Streaming & Messaging",
              percentage: 14,
            },
            {
              subcategoryName: "Application Definition & Image Build",
              percentage: 30,
            },
            {
              subcategoryName: "Continuous Integration & Delivery",
              percentage: 28,
            }
          ]
        ]
      };
    case "Orchestration & Management":
      return {
        layout: [
          [
            {
              subcategoryName: "Scheduling & Orchestration",
              percentage: 25,
            },
            {
              subcategoryName: "Coordination & Service Discovery",
              percentage: 12,
            },
            {
              subcategoryName: "Remote Procedure Call",
              percentage: 10,
            },
            {
              subcategoryName: "Service Proxy",
              percentage: 19,
            },
            {
              subcategoryName: "API Gateway",
              percentage: 15,
            },
            {
              subcategoryName: "Service Mesh",
              percentage: 19,
            }
          ]
        ]
      };
    case "Runtime":
      return {
        layout: [
          [
            {
              subcategoryName: "Cloud Native Storage",
              percentage: 50,
            },
            {
              subcategoryName: "Container Runtime",
              percentage: 30,
            },
            {
              subcategoryName: "Cloud Native Network",
              percentage: 20,
            }
          ]
        ]
      };
    case "Provisioning":
      return {
        layout: [
          [
            {
              subcategoryName: "Automation & Configuration",
              percentage: 22,
            },
            {
              subcategoryName: "Container Registry",
              percentage: 11,
            },
            {
              subcategoryName: "Security & Compliance",
              percentage: 56,
            },
            {
              subcategoryName: "Key Management",
              percentage: 11,
            }
          ]
        ]
      };
    case "Observability and Analysis":
      return {
        layout: [
          [
            {
            subcategoryName: "Monitoring",
            percentage: 100,
            }
          ],
          [
            {
              subcategoryName: "Logging",
              percentage: 25,
            },
            {
              subcategoryName: "Tracing",
              percentage: 25,
            },
            {
              subcategoryName: "Chaos Engineering",
              percentage: 25,
            },
            {
              subcategoryName: "Continuous Optimization",
              percentage: 25,
            }
          ]
        ]
      };
    case "Serverless":
      return {
        layout: [
          [
            {
              subcategoryName: "Framework",
              percentage: 50,
            },
            {
              subcategoryName: "Tools",
              percentage: 25,
            },
            {
              subcategoryName: "Security",
              percentage: 25,
            }
          ],
          [
            {
              subcategoryName: "Hosted Platform",
              percentage: 60,
            },
            {
              subcategoryName: "Installable Platform",
              percentage: 40,
            }
          ]
        ]
      };
    case "Wasm":
      return {
        layout: [
          [
            {
              subcategoryName: "Specifications",
              percentage: 17,
            },
            {
              subcategoryName: "Runtime",
              percentage: 17,
            },
            {
              subcategoryName: "Toolchain",
              percentage: 17,
            },
            {
              subcategoryName: "Packaging, Registries & Application Delivery",
              percentage: 17,
            },
            {
              subcategoryName: "Debugging and Observability",
              percentage: 16,
            },
            {
              subcategoryName: "Installable Platform",
              percentage: 16,
            }
          ]
        ]
      };
    case "CNCF Members":
      return {
        layout: [
          [
            {
              subcategoryName: "Platinum",
              percentage: 100,
            }
          ],
          [
            {
              subcategoryName: "Gold",
              percentage: 100,
            }
          ],
          [
            {
              subcategoryName: "Silver",
              percentage: 100,
            }
          ],
          [
            {
              subcategoryName: "End User Supporter",
              percentage: 100,
            }
          ],
          [
            {
              subcategoryName: "Nonprofit",
              percentage: 100,
            }
          ],
          [
            {
              subcategoryName: "Academic",
              percentage: 100,
            }
          ]
        ]
      };
    case "Platform":
      return {
        layout: [
          [
            {
              subcategoryName: "Certified Kubernetes - Distribution",
              percentage: 35,
            },
            {
              subcategoryName: "Certified Kubernetes - Hosted",
              percentage: 35,
            },
            {
              subcategoryName: "Certified Kubernetes - Installer",
              percentage: 15,
            },
            {
              subcategoryName: "PaaS/Container Service",
              percentage: 15,
            }
          ]
        ]
      };
    case "Special":
      return {
        layout: [
          [
            {
              subcategoryName: "Kubernetes Certified Service Provider",
              percentage: 100,
            }
          ],
          [
            {
              subcategoryName: "Kubernetes Training Partner",
              percentage: 80,
            },
            {
              subcategoryName: "Certified CNFs",
              percentage: 20,
            }
          ]
        ]
      };
    default:
      throw ("unsupported category");
  }
}
